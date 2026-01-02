import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection, AssetService, ID } from '@vendure/core';
import { SupplierProfile } from '../entities/supplier-profile.entity';

@Injectable()
export class SupplierProfileService {
    constructor(
        private connection: TransactionalConnection,
        private assetService: AssetService
    ) {}

    async getProfile(ctx: RequestContext): Promise<SupplierProfile> {
        const channelId = ctx.channelId;
        
        let profile = await this.connection.getRepository(ctx, SupplierProfile).findOne({
            where: { channel: { id: channelId } },
            relations: ['logo'],
        });

        // Auto-create if it doesn't exist yet
        if (!profile) {
            profile = new SupplierProfile({
                channelId: channelId,
                applyForMarketplace: false,
                commission: 0,
            });
            await this.connection.getRepository(ctx, SupplierProfile).save(profile);
        }

        return profile;
    }

    async updateProfile(ctx: RequestContext, input: any): Promise<SupplierProfile> {
        const profile = await this.getProfile(ctx);
        
        // Handle Logo assignment if provided
        if (input.logoId) {
            const asset = await this.assetService.findOne(ctx, input.logoId);
            if (asset) profile.logo = asset;
        }

        // Update scalar fields
        if (input.nameCompany !== undefined) profile.nameCompany = input.nameCompany;
        if (input.shortDescription !== undefined) profile.shortDescription = input.shortDescription;
        if (input.aboutCompany !== undefined) profile.aboutCompany = input.aboutCompany;
        if (input.applyForMarketplace !== undefined) profile.applyForMarketplace = input.applyForMarketplace;
        if (input.commission !== undefined) profile.commission = input.commission;

        return this.connection.getRepository(ctx, SupplierProfile).save(profile);
    }
}