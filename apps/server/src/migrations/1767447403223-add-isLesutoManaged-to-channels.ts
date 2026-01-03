import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIsLesutoManagedToChannels1767447403223 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsIslesutomanaged" boolean DEFAULT false`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsIslesutomanaged"`, undefined);
   }

}
