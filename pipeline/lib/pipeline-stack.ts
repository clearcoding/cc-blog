import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, GitHubTrigger } from '@aws-cdk/aws-codepipeline-actions';
import { App, Stack, StackProps, SecretValue } from '@aws-cdk/core';
import {Bucket} from '@aws-cdk/aws-s3'

export interface PipelineStackProps extends StackProps {
  domainName: string;
  siteSubDomain:string;
}

export class PipelineStack extends Stack {
  constructor(app: App, id: string, props: PipelineStackProps) {
    super(app, id, props);

    const siteDomain = `${props.siteSubDomain}.${props.domainName}`;

    const sourceOutput = new Artifact();
    const cdkBuildOutput = new codepipeline.Artifact('CdkBuildOutput');
    const staticSiteBuildOutput = new codepipeline.Artifact('StaticSiteBuildOutput');
  

    const oauth = SecretValue.secretsManager('cc-blog-github-token');

    const sourceAction = new GitHubSourceAction({
      actionName: 'GitHub',
      owner: 'clearcoding',
      repo: 'cc-blog',
      oauthToken: oauth,
      output: sourceOutput,
      branch: 'master', 
      trigger: GitHubTrigger.POLL // default: 'WEBHOOK', 'NONE' is also possible for no Source trigger
    });


    const staticSiteBuild = new codebuild.PipelineProject(this, 'CCBlogStaticSiteBuild', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'cd web',
              //'npm install',
            ],
          },
          build: {
            //commands: ' NODE_ENV=production npm run build',
          },
        },
        artifacts: {
          files: [
            'index.html'
          ]
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_3_0,
      },
    });
    const cdkBuild = new codebuild.PipelineProject(this, 'CCBlogCdkBuild', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'cd pipeline',
              'npm install'
              ]
            },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -- -o dist'
            ],
          },
        },
        artifacts: {
          'base-directory': 'pipeline/dist',
          files: [
            'CCBlogStaticSiteStack.template.json',
          ],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_3_0,
      },
    });

    const pipeline  = new codepipeline.Pipeline(this, 'CCBlogPipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            sourceAction,
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CCBlogStatic_Site_Build',
              project: staticSiteBuild,
              input: sourceOutput,
              outputs: [staticSiteBuildOutput],
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CCBlogCDK_Build',
              project: cdkBuild,
              input: sourceOutput,
              outputs: [cdkBuildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy-Infra',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Static_Site_CFN_Deploy',
              templatePath: cdkBuildOutput.atPath('CCBlogStaticSiteStack.template.json'),
              stackName: 'CCBlogDeploymentStack',
              adminPermissions: true
            }),
          ],
        },

        {
          stageName: 'Deploy-Site',
          actions: [
            new codepipeline_actions.S3DeployAction({
              actionName: 'Static_Site_S3_Deploy',
              bucket: Bucket.fromBucketName(this,'Static_Site_Bucket',siteDomain),
              input: staticSiteBuildOutput,           
            }),
          ],
        },
      ],
    });
  }
}
