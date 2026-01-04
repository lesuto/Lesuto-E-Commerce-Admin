import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBasePriceToProducts1767468182583 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBaseprice" integer`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBaseprice"`, undefined);
   }

}
