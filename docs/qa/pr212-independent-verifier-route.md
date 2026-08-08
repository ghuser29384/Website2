# PR #212 independent verifier deal access route

Independent verifiers do not become organization members when they accept an assignment. Their confidential deal access therefore uses the personal/independent deal route:

```text
/institutions/individual/deals/:dealId
```

Before assignment acceptance, that route denies access. After acceptance, `loadIndividualInstitutionalDeal` permits the exact named verifier and renders the deal title. The organization-scoped route remains membership-gated and is not the verifier access surface.

The authenticated browser matrix exercises the same independent route both before and after acceptance, so the negative and positive checks test the actual verifier authorization boundary rather than incidental organization-membership denial.
