import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission, Transaction } from '@vendure/core';
import { SupplierProfileService } from '../services/supplier-profile.service';

@Resolver()
export class SupplierProfileResolver {
    constructor(private supplierProfileService: SupplierProfileService) {}

    @Query()
    // Ensure only logged-in users with your custom permission can access
    @Allow(Permission.Authenticated) 
    async activeChannelProfile(@Ctx() ctx: RequestContext) {
        return this.supplierProfileService.getProfile(ctx);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Authenticated)
    async updateActiveChannelProfile(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.supplierProfileService.updateProfile(ctx, input);
    }
}