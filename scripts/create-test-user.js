#!/usr/bin/env node
/**
 * Crée (ou met à jour) un utilisateur de test VÉRIFIÉ, destiné aux tests de
 * charge k6 sur POST /users/login.
 *
 * Pourquoi un script dédié plutôt que /register ?
 *   /register crée un compte NON vérifié (verified:false) qui attend un code OTP.
 *   Or le login renvoie 403 tant que le compte n'est pas vérifié. Ce script
 *   insère donc directement un document avec verified:true, en réutilisant les
 *   mêmes utilitaires crypto que le serveur (encryptUserFields, hashField) et le
 *   même hash bcrypt — garantissant que le login fonctionnera à l'identique.
 *
 * Idempotent : relancé avec le même email, il met simplement à jour le mot de
 * passe et force verified:true (pas de doublon — index unique sur emailHash).
 *
 * Usage :
 *   node scripts/create-test-user.js [email] [password] [name]
 *   TEST_EMAIL=... TEST_PASSWORD=... node scripts/create-test-user.js
 *
 * Suppression du compte ensuite :
 *   node scripts/create-test-user.js --delete [email]
 */

require("dotenv").config();
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
const { MONGODB_URI, DB_NAME } = require("../server/config");
const { encryptUserFields, hashField } = require("../server/utils/crypto");

const args = process.argv.slice(2);
const isDelete = args[0] === "--delete";
const positional = isDelete ? args.slice(1) : args;

const EMAIL = (positional[0] || process.env.TEST_EMAIL || "loadtest@mytripcircle.local").toLowerCase();
const PASSWORD = positional[1] || process.env.TEST_PASSWORD || "LoadTest!42";
const NAME = positional[2] || process.env.TEST_NAME || "Load Test";

// Même règle que server/utils/authHelpers.isStrongPassword
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI manquant — vérifie le fichier .env");
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const users = db.collection("users");
  const emailHash = hashField(EMAIL);

  try {
    if (isDelete) {
      const { deletedCount } = await users.deleteOne({ emailHash });
      console.log(deletedCount ? `🗑️  Compte supprimé : ${EMAIL}` : `Aucun compte trouvé pour ${EMAIL}`);
      return;
    }

    if (!STRONG_PASSWORD.test(PASSWORD)) {
      throw new Error(
        "Mot de passe trop faible : min 8 caractères, avec minuscule, majuscule, chiffre et caractère spécial."
      );
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const now = new Date();
    const existing = await users.findOne({ emailHash });

    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        { $set: { password: passwordHash, verified: true, updatedAt: now } }
      );
      console.log(`♻️  Compte de test mis à jour (mot de passe réinitialisé, vérifié).`);
    } else {
      await users.insertOne(
        encryptUserFields({
          name: NAME,
          email: EMAIL,
          password: passwordHash,
          verified: true,
          createdAt: now,
          updatedAt: now,
        })
      );
      console.log(`✅ Compte de test créé.`);
    }

    console.log("\n── Identifiants ──");
    console.log(`  EMAIL    = ${EMAIL}`);
    console.log(`  PASSWORD = ${PASSWORD}`);
    console.log("\n── Lancer le test de charge ──");
    console.log(`  k6 run -e EMAIL='${EMAIL}' -e PASSWORD='${PASSWORD}' tests/load/login.load.js`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
