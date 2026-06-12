import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, initializeFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

let _db: Firestore | null = null;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

  if (!serviceAccountB64) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_B64 não está definido. Configure as variáveis de ambiente."
    );
  }

  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountB64, "base64").toString("utf-8")
  );

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

/**
 * Retorna uma instância do Firestore com preferRest=true.
 * Usa initializeFirestore() que é a API correta do firebase-admin v12
 * para passar settings (incluindo preferRest) no momento da criação.
 * Isso força HTTP/REST em vez de gRPC, evitando timeouts em serverless (Vercel).
 */
export function getAdminFirestore(): Firestore {
  if (_db) return _db;

  const app = getAdminApp();

  // initializeFirestore com preferRest evita gRPC (que trava em Vercel serverless)
  // Se já foi inicializado com as mesmas settings, retorna a instância existente
  try {
    _db = initializeFirestore(app, { preferRest: true });
  } catch {
    // Já inicializado (warm start com settings iguais) — pega a instância existente
    _db = getFirestore(app);
  }

  return _db;
}
