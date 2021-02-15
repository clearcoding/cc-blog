import * as cdk from '@aws-cdk/core';
import cloudfront = require('@aws-cdk/aws-cloudfront');
import route53 = require('@aws-cdk/aws-route53');
import s3 = require('@aws-cdk/aws-s3');
import acm = require('@aws-cdk/aws-certificatemanager');
import targets = require('@aws-cdk/aws-route53-targets/lib');
import { StackProps, Duration } from '@aws-cdk/core';

export interface StaticSiteStackProps extends StackProps {
     domainName: string;
     siteSubDomain:string;
  }
export class StaticSiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    const certArn = "arn:aws:acm:us-east-1:725714232753:certificate/63474aa5-080f-4601-bb09-72e0d5eb2d29";
    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.domainName });
    const siteDomain = `${props.siteSubDomain}.${props.domainName}`;
    // The code that defines your stack goes here
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
        bucketName: siteDomain,
        websiteIndexDocument: 'index.html',
        websiteErrorDocument: 'error.html',
        publicReadAccess: true,

        // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
        // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
        // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
        removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
        aliasConfiguration: {
            acmCertRef: certArn,
            names: [ siteDomain ],
            sslMethod: cloudfront.SSLMethod.SNI,
            securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
        },
        originConfigs: [
            {
                s3OriginSource: {
                    s3BucketSource: siteBucket
                },
                behaviors : [ {
                    isDefaultBehavior: true,
                    minTtl: Duration.seconds(604800)
                }],
            }
        ]
    });
    new route53.ARecord(this, 'SiteAliasRecord', {
        recordName: siteDomain,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        zone
    });

  }
}
