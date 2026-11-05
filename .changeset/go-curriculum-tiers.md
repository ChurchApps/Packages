---
"@churchapps/content-providers": minor
---

Go Curriculum: playlist items tagged with `tiers` only show for users whose /oauth/me `active_memberships` include a matching tier for that age group. Untagged items stay open to every signed-in user.
Memberships are matched by Go's MemberPress product id (Preschool/Elementary Basic and Premium, Basic and Premium Bundles, Platinum, plus Topher Time Plus → preschool videoPlus and JTS Plus → elementary videoPlus), with the "GROUP [TIER]" title as the fallback for unknown ids.
