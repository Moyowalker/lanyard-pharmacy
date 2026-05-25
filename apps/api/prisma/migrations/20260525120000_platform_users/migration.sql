CREATE TABLE "platform_users" (
    "id" VARCHAR(64) NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

INSERT INTO "platform_users" (
        "id",
        "first_name",
        "last_name",
        "email",
        "password_hash",
        "roles",
        "branch_ids",
        "is_active",
        "created_at",
        "updated_at"
) VALUES
        (
            'usr-admin-001',
            'Platform',
            'Admin',
            'admin@lanyardpharmacy.com',
            '9a494c222f0da86d0cdb944ea3249dcf:0a1f2b5079a1c4b2294bd2d88b6a2d3a1262b869ed144eac69f1a33a1b511a68e60a286b0e91a2c3b736ea970f8942f37bd6f217fd6d1098e6ea25400907f47f',
            ARRAY['super_admin']::TEXT[],
            ARRAY['branch-main','branch-airport']::TEXT[],
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ),
        (
            'usr-pharm-001',
            'Lead',
            'Pharmacist',
            'pharmacist@lanyardpharmacy.com',
            'c97b7369ad0b91abfcc2510e4d7ada32:0d0909076c894451eb870990e860f00b17deb09b263fd5c6ad43ea9df5c89f629e14e21379a2c1e7b5aafc2d347b788aa61bba299a663a7a54ab8f537a846074',
            ARRAY['pharmacist']::TEXT[],
            ARRAY['branch-main']::TEXT[],
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ),
        (
            'cust-100',
            'Ada',
            'Okafor',
            'ada@example.com',
            '14770314fe203853491d612fcf6d339d:9cf13d6c466e52d348eb5a6708becfaf88a44b924f527f813f4a21ae2a7c6426455612ad0b2c79a55823a3ac427640deb90291783db7c7300c0f1ce5a9797029',
            ARRAY['customer']::TEXT[],
            ARRAY[]::TEXT[],
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
ON CONFLICT ("email") DO NOTHING;
