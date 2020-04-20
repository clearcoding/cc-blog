#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { PipelineStack } from '../lib/pipeline-stack';
import {StaticSiteStack} from '../lib/static-site-stack'
const app = new cdk.App();

/**
 * This stack relies on getting the domain name from CDK context.
 * Use 'cdk synth -c domain=mystaticsite.com -c subdomain=www'
 * Or add the following to cdk.json:
 * {
 *   "context": {
 *     "domain": "mystaticsite.com",
 *     "subdomain": "www"
 *   }
 * }
**/
const props = {
    domainName: app.node.tryGetContext('domain'),
    siteSubDomain: app.node.tryGetContext('subdomain'),
    env: { 
        account: process.env.CDK_DEFAULT_ACCOUNT, 
        region: process.env.CDK_DEFAULT_REGION 
        }
}

new StaticSiteStack(app,'CCBlogStaticSiteStack',props)
new PipelineStack(app, 'CCBlogPipelineStack',props);


app.synth();

