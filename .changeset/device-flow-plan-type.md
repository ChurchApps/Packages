---
"@churchapps/content-providers": minor
---

Pass the approver's plan-type binding through the OAuth device flow. When the B1Admin approval page binds a screen to a plan type, the token endpoint returns `plan_type_id`; `DeviceFlowHelper.pollDeviceFlowToken` now surfaces it as `planTypeId` on the success result so TV apps can enable their "Today's Plan" view immediately after connecting.
