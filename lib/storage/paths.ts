export function userAvatarPath(userId: string): string {
  return `users/${userId}/avatar.jpg`;
}

export function tutorCredentialPath(tutorId: string, fileName: string): string {
  return `tutors/${tutorId}/credentials/${fileName}`;
}
