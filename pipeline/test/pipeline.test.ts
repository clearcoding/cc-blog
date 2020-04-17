import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import Pipeline = require('../lib/pipeline-stack');
import { PipelineStackProps } from '../lib/pipeline-stack';
import { Stack } from '@aws-cdk/core';

test('Empty Stack', () => {
    const app = new cdk.App();
    const props :PipelineStackProps = {domainName:"",siteSubDomain:""}
    // WHEN
    const stack = new Pipeline.PipelineStack(app, 'MyTestStack', props);
    // THEN
    // expectCDK(stack).to(matchTemplate({
    //   "Resources": {}
    // }, MatchStyle.EXACT))
});
