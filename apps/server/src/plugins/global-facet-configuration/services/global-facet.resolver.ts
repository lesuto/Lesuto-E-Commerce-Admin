import { Mutation, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission, Transaction } from '@vendure/core';
import { GlobalFacetService } from './global-facet.service';

@Resolver()
export class GlobalFacetResolver {
    constructor(private globalFacetService: GlobalFacetService) {}

    @Mutation()
    @Allow(Permission.SuperAdmin) // Only SuperAdmins can force sync
    @Transaction() 
    async syncGlobalFacets(@Ctx() ctx: RequestContext) {
        await this.globalFacetService.syncAllManually(ctx);
        return true;
    }
}