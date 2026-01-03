import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveProfileFieldsFromSupplierChannels1767382868220 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsCommissionrate"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsLogourl"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsSupplierdescription"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsSupplierdescription" text`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsLogourl" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsCommissionrate" double precision DEFAULT '15'`, undefined);
   }

}
