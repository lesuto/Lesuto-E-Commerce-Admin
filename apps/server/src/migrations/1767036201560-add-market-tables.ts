import {MigrationInterface, QueryRunner} from "typeorm";

export class AddMarketTables1767036201560 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "supplier_subscription" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "sellerChannelId" character varying NOT NULL, "supplierChannelId" character varying NOT NULL, "id" SERIAL NOT NULL, CONSTRAINT "PK_cdeb050d00e87bc0675fb293dc3" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsIssupplier" boolean DEFAULT false`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsCommissionrate" double precision DEFAULT '15'`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsLogourl" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsSupplierdescription" text`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsIsmarketplaceapproved" boolean DEFAULT false`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsIsmarketplaceapproved"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsSupplierdescription"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsLogourl"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsCommissionrate"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsIssupplier"`, undefined);
        await queryRunner.query(`DROP TABLE "supplier_subscription"`, undefined);
   }

}
