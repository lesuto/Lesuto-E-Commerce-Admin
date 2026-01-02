import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCustomFieldsIsStorefront1767362416458 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsIsstorefront" boolean DEFAULT false`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsIsstorefront"`, undefined);
   }

}
