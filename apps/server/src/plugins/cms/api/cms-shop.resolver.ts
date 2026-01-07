import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { CMSService } from '../services/cms.service';

@Resolver()
export class CmsShopResolver {
    constructor(private cmsService: CMSService) {}

    @Query()
    async page(@Ctx() ctx: RequestContext, @Args('slug') slug: string) {
        return this.cmsService.getPage(ctx, slug);
    }
}