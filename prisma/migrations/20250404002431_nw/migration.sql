/*
  Warnings:

  - You are about to drop the `Theme` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ModuleToTheme` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `jobIndustry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `User` table. All the data in the column will be lost.
  - Added the required column `moduleCode` to the `Module` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "_ModuleToTheme_B_index";

-- DropIndex
DROP INDEX "_ModuleToTheme_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Theme";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ModuleToTheme";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Course" (
    "courseCode" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "summary" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "moduleId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Progress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CourseToModule" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CourseToModule_A_fkey" FOREIGN KEY ("A") REFERENCES "Course" ("courseCode") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CourseToModule_B_fkey" FOREIGN KEY ("B") REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Module" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Module" ("content", "createdAt", "description", "difficulty", "duration", "id", "title", "updatedAt") SELECT "content", "createdAt", "description", "difficulty", "duration", "id", "title", "updatedAt" FROM "Module";
DROP TABLE "Module";
ALTER TABLE "new_Module" RENAME TO "Module";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "profilePicture" TEXT,
    "jobTitle" TEXT,
    "field" TEXT,
    "notifications" TEXT DEFAULT 'all',
    "privacy" TEXT DEFAULT 'public',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "notifications", "password", "privacy", "profilePicture", "role") SELECT "createdAt", "email", "id", "name", "notifications", "password", "privacy", "profilePicture", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_CourseToModule_AB_unique" ON "_CourseToModule"("A", "B");

-- CreateIndex
CREATE INDEX "_CourseToModule_B_index" ON "_CourseToModule"("B");
