import {MigrationInterface, QueryRunner} from "typeorm";

export class ChannelSupplierProfileTableInit1767376914392 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "channel_supplier_profile" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "nameCompany" text, "shortDescription" character varying, "aboutCompany" text, "applyForMarketplace" boolean NOT NULL DEFAULT false, "commission" double precision NOT NULL DEFAULT '0', "id" SERIAL NOT NULL, "logoId" integer, "channelId" integer NOT NULL, CONSTRAINT "REL_da727aaa5a3ec5e96ef8d1d91c" UNIQUE ("channelId"), CONSTRAINT "PK_2b2124ac4d1222e2f36a746c515" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "channel_supplier_profile" ADD CONSTRAINT "FK_18e135bbfb3990dba6fabb056f4" FOREIGN KEY ("logoId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "channel_supplier_profile" ADD CONSTRAINT "FK_da727aaa5a3ec5e96ef8d1d91c7" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel_supplier_profile" DROP CONSTRAINT "FK_da727aaa5a3ec5e96ef8d1d91c7"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel_supplier_profile" DROP CONSTRAINT "FK_18e135bbfb3990dba6fabb056f4"`, undefined);
        await queryRunner.query(`DROP TABLE "channel_supplier_profile"`, undefined);
   }

}
