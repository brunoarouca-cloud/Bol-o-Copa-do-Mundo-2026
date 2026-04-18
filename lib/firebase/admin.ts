import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
