#!/usr/bin/env node
/**
 * Setup Local - Real 94 Mala Direta
 * 
 * Este script ajuda a configurar o projeto para rodar localmente com Xano.
 * 
 * Uso: node setup-local.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

console.log("\n╔══════════════════════════════════════════════════╗");
console.log("║   Real 94 - Mala Direta — Setup Local + Xano    ║");
console.log("╚══════════════════════════════════════════════════╝\n");

async function main() {
  console.log("Este assistente vai configurar o projeto para rodar localmente.\n");

  // 1. Xano URL
  const xanoUrl = await ask("📡 URL base da API do Xano (ex: https://x8ki-letl-twmt.n7.xano.io/api:mala-direta): ");
  if (!xanoUrl) {
    console.error("❌ URL do Xano é obrigatória!");
    process.exit(1);
  }

  // 2. JWT Secret
  const jwtSecret = "real94-mala-direta-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

  // 3. Port
  const port = await ask("🔌 Porta do servidor (padrão: 3000): ") || "3000";

  // Generate .env
  const envContent = `# ============================================
# Real 94 - Mala Direta — Configuração Local
# ============================================

# Xano API
XANO_API_BASE_URL=${xanoUrl}

# Autenticação Local (JWT)
JWT_SECRET=${jwtSecret}

# Aplicação
VITE_APP_TITLE=Real 94 - Mala Direta
NODE_ENV=development
PORT=${port}

# Modo de banco de dados: "xano" para usar Xano, "local" para MySQL direto
DB_MODE=xano
`;

  writeFileSync(".env", envContent);
  console.log("\n✅ Arquivo .env criado com sucesso!");

  console.log("\n📋 Próximos passos:");
  console.log("   1. Crie as tabelas no Xano conforme o GUIA-XANO-SETUP.md");
  console.log("   2. Crie os endpoints REST no Xano conforme o guia");
  console.log("   3. Execute: pnpm install");
  console.log("   4. Execute: pnpm dev");
  console.log(`   5. Acesse: http://localhost:${port}`);
  console.log("\n🔑 Seu JWT_SECRET foi gerado automaticamente: " + jwtSecret.substring(0, 20) + "...");
  console.log("\n");

  rl.close();
}

main().catch(console.error);
