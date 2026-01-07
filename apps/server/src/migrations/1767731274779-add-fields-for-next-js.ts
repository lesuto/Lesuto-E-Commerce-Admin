import {MigrationInterface, QueryRunner} from "typeorm";

export class AddFieldsForNextJs1767731274779 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "page_channels_channel" ("pageId" integer NOT NULL, "channelId" integer NOT NULL, CONSTRAINT "PK_a7124120aadf07d16d10684b58c" PRIMARY KEY ("pageId", "channelId"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_9215ad10aca59ea9ef622d9824" ON "page_channels_channel" ("pageId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_e9444a8c7d98b8a3b35ca1ab43" ON "page_channels_channel" ("channelId") `, undefined);
        await queryRunner.query(`ALTER TABLE "page" ADD "enabled" boolean NOT NULL DEFAULT true`, undefined);
        await queryRunner.query(`ALTER TABLE "page" ALTER COLUMN "blocks" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "page_channels_channel" ADD CONSTRAINT "FK_9215ad10aca59ea9ef622d9824b" FOREIGN KEY ("pageId") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
        await queryRunner.query(`ALTER TABLE "page_channels_channel" ADD CONSTRAINT "FK_e9444a8c7d98b8a3b35ca1ab430" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "page_channels_channel" DROP CONSTRAINT "FK_e9444a8c7d98b8a3b35ca1ab430"`, undefined);
        await queryRunner.query(`ALTER TABLE "page_channels_channel" DROP CONSTRAINT "FK_9215ad10aca59ea9ef622d9824b"`, undefined);
        await queryRunner.query(`ALTER TABLE "page" ALTER COLUMN "blocks" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "page" DROP COLUMN "enabled"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_e9444a8c7d98b8a3b35ca1ab43"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_9215ad10aca59ea9ef622d9824"`, undefined);
        await queryRunner.query(`DROP TABLE "page_channels_channel"`, undefined);
   }

}
