/**
 * Promove um usuário a admin via Custom Claims do Firebase Auth
 * Execução: pnpm set-admin
 *
 * Uso: Edite o e-mail abaixo antes de rodar, ou passe como argumento:
 *   ADMIN_EMAIL=brunoarouca@gmail.com pnpm set-admin
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, readdirSync } from "fs";

// Inicializa Firebase Admin usando o arquivo serviceAccount JSON local
if (!getApps().length) {
  const files = readdirSync(".");
  const saFile = files.find(
    (f) => f.endsWith(".json") && (f.includes("firebase-adminsdk") || f.startsWith("serviceAccount"))
  );
  if (!saFile) throw new Error("Arquivo de service account não encontrado. Baixe em Firebase Console > Configurações > Contas de serviço.");
  const sa = JSON.parse(readFileSync(saFile, "utf-8"));
  console.log(`🔑 Usando service account: ${saFile}`);
  initializeApp({ credential: cert(sa) });
}

const adminEmail = process.env.ADMIN_EMAIL ?? "brunoarouca@gmail.com";

async function setAdminClaim() {
  const auth = getAuth();
  const db = getFirestore();

  console.log(`🔑 Promovendo ${adminEmail} a admin...`);

  // Busca o usuário pelo e-mail
  const user = await auth.getUserByEmail(adminEmail);
  console.log(`   UID: ${user.uid}`);

  // Define custom claim
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log("   Custom claim { admin: true } definido.");

  // Atualiza campo isAdmin no Firestore para refletir na UI
  const userRef = db.collection("users").doc(user.uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    await userRef.update({ isAdmin: true });
    console.log("   Campo isAdmin atualizado no Firestore.");
  } else {
    console.log(
      "   ⚠️  Documento do usuário não encontrado em Firestore. Crie uma conta primeiro."
    );
  }

  console.log(`\n✅ ${adminEmail} agora é admin!`);
  console.log(
    "   O usuário deve fazer logout e login novamente para o claim ser carregado no cliente."
  );

  process.exit(0);
}

setAdminClaim().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
