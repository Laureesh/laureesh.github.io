# AWS Services: Purpose, Examples, and Memory Cues

Prepared November 8, 2026. The 50 core multiple-choice questions follow your original list in order. Each has four options, one marked correct answer, and an explanation comparing the alternatives. Examples and memory cues are teaching aids, not exhaustive service specifications.

## Import into Flashbolt

1. Create a set named **AWS Services — 50 Purposes**.
2. Open `aws-50-services-flashbolt-import.txt` in this folder and copy its entire contents into Flashbolt's paste/import field.
3. Review the preview: it should contain **50 multiple-choice questions**, then save.
4. Optionally create **AWS Services — Tell Them Apart** and paste `aws-50-services-comparison-practice.txt` for **18 multiple-choice comparison questions with explanations**. You can also append these to the main set for 68 questions total.

The files use Flashbolt's supported numbered quiz format: a prompt, `answer`, options A–D, a `Correct Answer:` marker beneath the correct option, and an `Explanation` section. Both were checked with the project's actual `parseQuizResults` importer: every question retains four distinct options, exactly one correct answer, and an explanation. Correct answers are distributed across A–D. These are import files; they have not been saved into your signed-in cloud library.

Start with ten core questions at a time. Select an answer before reading the explanation. Then try the comparison questions to check whether you can distinguish services in a situation.

## Names and older coursework

- Item 1, “AWS Network Firewall Manager,” is interpreted as **AWS Network Firewall**, since item 2 separately names Firewall Manager. They are distinct: one filters network traffic, the other centrally manages policies. See [AWS security service descriptions](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-services.html).
- Item 13 is **AWS Systems Manager**; item 24 is interpreted as **AWS Identity and Access Management (IAM)**. IAM Access Analyzer and IAM Identity Center are different services. See [management services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/management-governance.html) and [security services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-services.html).
- Item 15, “AWS Quicksight S,” is interpreted as **Amazon QuickSight**, currently documented as **Amazon Quick Sight**. Its relevant study purpose is business intelligence and dashboards. See [Quick Sight documentation](https://docs.aws.amazon.com/quicksight/latest/developerguide/).
- Item 26, **AppStream 2.0**, is now named **Amazon WorkSpaces Applications**. See [AWS application streaming documentation](https://docs.aws.amazon.com/appstream2/latest/developerguide/).
- Item 38 uses the precise name **EC2 Instance Savings Plans**. These commit to an instance family in a Region; Compute Savings Plans offer broader flexibility. See [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html).
- **CodeCommit** reopened to new customers; older claims that it remains closed are outdated. See [AWS CodeCommit announcement](https://aws.amazon.com/blogs/devops/aws-codecommit-returns-to-general-availability/).
- **Snowball Edge** became available only to existing customers on November 7, 2025. See [AWS Snow device updates](https://aws.amazon.com/blogs/storage/aws-snow-device-updates/).
- **Enterprise On-Ramp Support** is transitioning during 2026 and ends January 1, 2027. See [AWS support plan transition](https://docs.aws.amazon.com/awssupport/latest/user/support-plans-eos.html).
- **Amazon Elastic Transcoder** shut down November 13, 2025. Its card teaches its historical purpose because it appears in your coursework. See [AWS shutdown list](https://docs.aws.amazon.com/general/latest/gr/elastictranscoder.html).

## AWS references for the cards

| Cards / topics | Official references |
| --- | --- |
| Network Firewall, Firewall Manager, WAF, IAM, Artifact, Shield | [Security services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-services.html) |
| Keys and secrets | [KMS](https://aws.amazon.com/kms/), [Secrets Manager](https://aws.amazon.com/secrets-manager/) |
| Threat detection, vulnerabilities, investigation, sensitive data | [GuardDuty](https://aws.amazon.com/guardduty/), [Inspector](https://aws.amazon.com/inspector/), [Detective](https://aws.amazon.com/detective/), [Macie](https://aws.amazon.com/macie/) |
| Global Accelerator, Direct Connect, Transit Gateway | [Networking services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/networking-services.html) |
| Application Discovery Service | [Discovery purpose](https://docs.aws.amazon.com/application-discovery/latest/userguide/what-is-appdiscovery.html) |
| Service Catalog, Systems Manager, CloudTrail, CloudFormation, Organizations, Config | [Management and governance](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/management-governance.html) |
| Lex, Rekognition, Polly | [AI services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/machine-learning.html) |
| Athena, Kinesis | [Analytics](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/analytics.html) |
| CloudShell, CodeCommit, CodeDeploy, X-Ray | [Developer tools](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/developer-tools.html) |
| Local Zones | [Local Zones overview](https://docs.aws.amazon.com/local-zones/latest/ug/what-is-aws-local-zones.html) |
| Outposts, Wavelength, Fargate, EC2 Auto Scaling | [Compute services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/compute-services.html) |
| Storage Gateway | [Storage services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/storage-services.html) |
| SQS, SNS, Step Functions | [Application integration](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/application-integration.html) |
| Budgets | [Cloud financial management](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/aws-cost-management.html) |
| Support Concierge | [AWS support features](https://www.amazonaws.cn/en/support/features/), [support plans](https://aws.amazon.com/premiumsupport/plans/) |

The cards focus on service purposes rather than prices, regional availability, or an exhaustive lifecycle audit.
