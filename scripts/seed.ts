import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { MOCK_TUTORS } from "../lib/mock-tutors";
import { TUTOR_PROFILE_DETAILS } from "../lib/tutor-profiles";

config({ path: ".env.local" });

function getSeedFirestore() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Defina FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY em .env.local",
    );
  }

  const app =
    getApps().length > 0
      ? getApps()[0]!
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });

  return getFirestore(app);
}

async function seed() {
  const db = getSeedFirestore();

  for (const tutor of MOCK_TUTORS) {
    const profile = TUTOR_PROFILE_DETAILS[tutor.id];

    if (!profile) {
      console.warn(`Perfil mock ausente para tutor ${tutor.id}, pulando.`);
      continue;
    }

    await db
      .collection("tutors")
      .doc(tutor.id)
      .set(
        {
          userId: tutor.id,
          name: tutor.name,
          subject: tutor.subject,
          city: tutor.city,
          state: tutor.state,
          bio: tutor.bio,
          headline: profile.headline,
          about: profile.about,
          methodology: profile.methodology,
          individualPrice: tutor.individualPrice,
          collectivePrice: tutor.collectivePrice,
          modality: tutor.modality,
          lessonTypes: tutor.lessonTypes,
          isVerified: profile.isVerified,
          verificationStatus: profile.isVerified ? "approved" : "pending",
          isOnline: tutor.isOnline,
          hoursTaught: profile.hoursTaught,
          studentsServed: profile.studentsServed,
          rating: tutor.rating,
          reviewCount: tutor.reviewCount,
          avatarUrl: tutor.avatarUrl,
          avatarColor: tutor.avatarColor,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    for (const hub of profile.collectiveHubs) {
      await db
        .collection("collectiveHubs")
        .doc(hub.id)
        .set(
          {
            tutorId: tutor.id,
            title: hub.title,
            description: hub.description,
            maxStudents: hub.maxStudents,
            confirmedStudentIds: Array.from(
              { length: hub.confirmedStudents },
              (_, index) => `seed-${hub.id}-student-${index + 1}`,
            ),
            confirmedStudentCount: hub.confirmedStudents,
            currentPrice: hub.currentPrice,
            fullPrice: hub.fullPrice,
            schedule: hub.schedule,
            modality: hub.modality,
            status: hub.confirmedStudents >= hub.maxStudents ? "full" : "open",
            subject: tutor.subject,
            tutorName: tutor.name,
            individualPrice: tutor.individualPrice,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    console.log(`Seed concluído para ${tutor.name} (${tutor.id})`);
  }

  console.log(`\n${MOCK_TUTORS.length} tutores e turmas coletivas foram gravados no Firestore.`);
}

seed().catch((error) => {
  console.error("Falha ao executar seed:", error);
  process.exit(1);
});
