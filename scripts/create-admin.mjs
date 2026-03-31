#!/usr/bin/env node
/**
 * create-admin.mjs
 *
 * Cria ou atualiza a senha de um usuário administrador no banco de dados.
 *
 * Uso:
 *   node scripts/create-admin.mjs --email SEU@EMAIL.COM --password SUASENHA
 *   node scripts/create-admin.mjs --email SEU@EMAIL.COM --password SUASENHA --name "Seu Nome"
 *
 * Exemplo:
 *   node scripts/create-admin.mjs --email pedro.gabriel@real94.com.br --password Real94@2026
 */
import { createConnection } from "mysql2/promise";
import { createHash, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env ───────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../.env");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env not found, use existing process.env
  }
}

loadEnv();

// ─── Parse CLI args ───────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && args[i + 1]) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return result;
}

// ─── Hash password ────────────────────────────────────────────────────────────
async function hashPassword(password) {
  try {
    const { default: bcrypt } = await import("bcryptjs");
    return await bcrypt.hash(password, 12);
  } catch {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(salt + password).digest("hex");
    console.warn("⚠️  bcryptjs não encontrado. Usando SHA-256 como fallback.");
    return `sha256:${salt}:${hash}`;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Real 94 — Mala Direta: Criar Administrador    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const args = parseArgs();

  if (!args.email || !args.password) {
    console.log("Uso:");
    console.log("  node scripts/create-admin.mjs --email SEU@EMAIL.COM --password SUASENHA");
    console.log("  node scripts/create-admin.mjs --email SEU@EMAIL.COM --password SUASENHA --name \"Seu Nome\"\n");
    console.log("Exemplo:");
    console.log("  node scripts/create-admin.mjs --email pedro.gabriel@real94.com.br --password Real94@2026\n");
    process.exit(1);
  }

  const email = args.email.trim().toLowerCase();
  const password = args.password;
  const name = args.name || email;

  if (!email.includes("@")) {
    console.error("❌ Email inválido.");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("❌ Senha muito curta (mínimo 6 caracteres).");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL não configurado no .env");
    process.exit(1);
  }

  console.log(`📧 Email:  ${email}`);
  console.log(`👤 Nome:   ${name}`);
  console.log("⏳ Criando hash da senha...");

  const passwordHash = await hashPassword(password);

  console.log("⏳ Conectando ao banco de dados...");

  let conn;
  try {
    const urlObj = new URL(dbUrl.replace(/^mysql2?:\/\//, "mysql://"));
    const sslParam = urlObj.searchParams.get("ssl");
    urlObj.searchParams.delete("ssl");

    // TiDB Cloud requires SSL — parse the ssl param from the URL
    // and always enable it (rejectUnauthorized:true for production,
    // but we use false as fallback to avoid certificate chain issues on Windows)
    let sslOption = { rejectUnauthorized: true };
    if (sslParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sslParam));
        sslOption = parsed;
      } catch {
        // ignore
      }
    }

    conn = await createConnection({
      host: urlObj.hostname,
      port: parseInt(urlObj.port || "3306"),
      user: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      database: urlObj.pathname.slice(1),
      ssl: sslOption,
    });
  } catch (err) {
    console.error("❌ Falha ao conectar ao banco de dados:", err.message);
    process.exit(1);
  }

  try {
    const [rows] = await conn.execute(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length > 0) {
      await conn.execute(
        "UPDATE users SET passwordHash = ?, role = 'admin', name = ?, loginMethod = 'local', updatedAt = NOW() WHERE email = ?",
        [passwordHash, name, email]
      );
      console.log(`\n✅ Senha atualizada para: ${email}`);
      console.log("   Role: admin");
    } else {
      const openId = `local_${Date.now()}_${randomBytes(8).toString("hex")}`;
      await conn.execute(
        `INSERT INTO users (openId, email, name, loginMethod, role, passwordHash, lastSignedIn, createdAt, updatedAt)
         VALUES (?, ?, ?, 'local', 'admin', ?, NOW(), NOW(), NOW())`,
        [openId, email, name, passwordHash]
      );
      console.log(`\n✅ Administrador criado com sucesso!`);
      console.log(`   Email: ${email}`);
      console.log(`   Nome:  ${name}`);
      console.log(`   Role:  admin`);
    }

    console.log("\n🚀 Acesse http://localhost:3000/login e faça login com as credenciais acima.\n");
  } catch (err) {
    console.error("❌ Erro ao inserir no banco:", err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err.message || err);
  process.exit(1);
});
