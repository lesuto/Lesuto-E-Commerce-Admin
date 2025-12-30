import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCustomFields1766819706121 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsOwnercompany" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsOwnercompany" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsOwnercompany"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsOwnercompany"`, undefined);
   }

}
