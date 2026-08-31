import {
  getBlob,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db, requireFirebaseApp, storage } from "@/lib/firebase/client";
import { tutorCredentialPath, userAvatarPath } from "@/lib/storage/paths";
import {
  sanitizeCredentialFileName,
  validateDocumentFile,
  validateImageFile,
} from "@/lib/storage/validation";

function assertOwnUpload(userId: string): void {
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== userId) {
    throw new Error("Você só pode enviar arquivos para a sua própria conta.");
  }
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  await requireFirebaseApp();
  assertOwnUpload(userId);

  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = userAvatarPath(userId);
  const metadata: UploadMetadata = { contentType: file.type };
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", userId), {
    photoUrl: downloadUrl,
    updatedAt: serverTimestamp(),
  });

  return downloadUrl;
}

export async function uploadTutorCredential(
  tutorId: string,
  file: File,
): Promise<{ fileName: string }> {
  await requireFirebaseApp();
  assertOwnUpload(tutorId);

  const validationError = validateDocumentFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const fileName = sanitizeCredentialFileName(file);
  const path = tutorCredentialPath(tutorId, fileName);
  const metadata: UploadMetadata = { contentType: file.type };
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, metadata);

  return { fileName };
}

export async function getTutorCredentialBlob(
  tutorId: string,
  fileName: string,
): Promise<Blob> {
  await requireFirebaseApp();
  const storageRef = ref(storage, tutorCredentialPath(tutorId, fileName));
  return getBlob(storageRef);
}
