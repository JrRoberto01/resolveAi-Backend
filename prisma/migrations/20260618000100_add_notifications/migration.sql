CREATE TYPE "NotificationType" AS ENUM (
    'SUPPORTED_OCCURRENCE_RESOLVED',
    'OCCURRENCE_COMMENTED',
    'PASSWORD_CHANGED'
);

CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "occurrenceId" INTEGER,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_occurrenceId_idx" ON "Notification"("occurrenceId");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_occurrenceId_fkey"
FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
