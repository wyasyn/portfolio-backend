/*
  Warnings:

  - You are about to drop the column `views` on the `blogs` table. All the data in the column will be lost.
  - You are about to drop the `view_analytics` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `skills` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "view_analytics" DROP CONSTRAINT "view_analytics_blogId_fkey";

-- DropForeignKey
ALTER TABLE "view_analytics" DROP CONSTRAINT "view_analytics_projectId_fkey";

-- DropIndex
DROP INDEX "blogs_published_idx";

-- DropIndex
DROP INDEX "contacts_read_idx";

-- AlterTable
ALTER TABLE "blogs" DROP COLUMN "views",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "readTime" INTEGER;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "replied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "view_analytics";

-- CreateTable
CREATE TABLE "view_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "blogId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "city" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "view_events_projectId_timestamp_idx" ON "view_events"("projectId", "timestamp");

-- CreateIndex
CREATE INDEX "view_events_blogId_timestamp_idx" ON "view_events"("blogId", "timestamp");

-- CreateIndex
CREATE INDEX "view_events_timestamp_idx" ON "view_events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_email_key" ON "newsletter"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscribed_idx" ON "newsletter"("subscribed");

-- CreateIndex
CREATE INDEX "newsletter_email_idx" ON "newsletter"("email");

-- CreateIndex
CREATE INDEX "blogs_published_publishedAt_idx" ON "blogs"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "blogs_deletedAt_idx" ON "blogs"("deletedAt");

-- CreateIndex
CREATE INDEX "blogs_tags_idx" ON "blogs"("tags");

-- CreateIndex
CREATE INDEX "contacts_read_replied_idx" ON "contacts"("read", "replied");

-- CreateIndex
CREATE INDEX "contacts_createdAt_idx" ON "contacts"("createdAt");

-- CreateIndex
CREATE INDEX "projects_order_idx" ON "projects"("order");

-- CreateIndex
CREATE INDEX "projects_deletedAt_idx" ON "projects"("deletedAt");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "skills_order_idx" ON "skills"("order");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- AddForeignKey
ALTER TABLE "view_events" ADD CONSTRAINT "view_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_events" ADD CONSTRAINT "view_events_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
