import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, RequestContext, Transaction } from '@vendure/core';
import { CMSService } from '../services/cms.service';

@Resolver()
export class CmsAdminResolver {
    constructor(private cmsService: CMSService) {}

    @Query()
    @Allow(Permission.ReadCatalog) 
    async page(@Ctx() ctx: RequestContext, @Args('slug') slug: string) {
        return this.cmsService.getPage(ctx, slug);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async savePage(
        @Ctx() ctx: RequestContext, 
        @Args('slug') slug: string,
        @Args('title') title: string,
        @Args('blocks') blocks: any
    ) {
        return this.cmsService.savePage(ctx, slug, title, blocks);
    }
}