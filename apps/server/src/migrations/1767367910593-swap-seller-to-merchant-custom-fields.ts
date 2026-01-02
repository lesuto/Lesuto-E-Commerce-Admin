import {MigrationInterface, QueryRunner} from "typeorm";

export class SwapSellerToMerchantCustomFields1767367910593 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "supplier_subscription" RENAME COLUMN "sellerChannelId" TO "merchantChannelId"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsIsmerchant" boolean DEFAULT false`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsIsmerchant"`, undefined);
        await queryRunner.query(`ALTER TABLE "supplier_subscription" RENAME COLUMN "merchantChannelId" TO "sellerChannelId"`, undefined);
   }

}
