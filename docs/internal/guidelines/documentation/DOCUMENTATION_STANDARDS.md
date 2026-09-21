---
description: "Internal documentation standards covering when to include or exclude code examples and the expected reference format for post-implementation docs."
---

# Documentation Standards

## Code in Documentation

### Rule: No Duplicate Code in Documentation

**Principle**: Documentation should reference implementation files, not duplicate code.

### When to Include Code in Documentation

1. **Initial Planning Phase**:
   - ✅ Code examples are acceptable during design/planning
   - ✅ Helps communicate design intent
   - ✅ Useful for discussion and review

2. **Post-Implementation**:
   - ❌ **DO NOT** maintain code in documentation after implementation
   - ✅ **DO** replace code blocks with file references
   - ✅ Reference actual implementation files by path and symbol name

### Documentation Update Process

1. **During Implementation**:
   - Keep code examples in docs while implementing
   - Update examples if design changes

2. **After Implementation**:
   - Replace code blocks with file references
   - Use format: `See [Function/Class] in [file path]`
   - Avoid line numbers - they rot silently on the next edit to the file
   - Update status to indicate completion

### Reference Format

Prefer **symbol references over line numbers**. Line numbers are the single most drift-prone thing
a doc can carry: a 2026-08-28 verification pass found that all 68 line references in
`docs/internal/api-reference/backend-api-reference.md` and every one in `frontend-api-reference.md`
pointed at the wrong place, while the symbol names beside them were still correct and greppable.
Cite a line range only when the thing being referenced has no name (a config block, a specific
branch inside a long function), and expect to re-verify it.

When referencing implemented code:

```markdown
**Implementation**: See `Team` model in `core/models/team.go`
```

For specific functions:

```markdown
**Create Method**: See `TeamRepository.Create()` in `core/repository/team.go`
```

For multiple related files:

```markdown
**Team Models**: 
- `Team` - `core/models/team.go`
- `TeamMember` - `core/models/team_member.go`
- `TeamOrganizationAccess` - `core/models/team_organization_access.go`
```

### Example: Before and After

#### ❌ Bad (After Implementation)

```markdown
### Team Model

```go
type Team struct {
    ID uuid.UUID
    Name string
    // ...
}
```
```

#### ✅ Good (After Implementation)

```markdown
### Team Model

**Implementation**: See the `Team` struct in `core/models/team.go`

**Fields**:
- `ID` - UUID primary key
- `Name` - Team name (unique within organization)
- `OrganizationID` - Reference to organization
- `Visibility` - "organization" or "secret" (default: "secret")
- `AllowMemberTokenManagement` - Controls team token management
- `SSOTeamID` - Optional SSO team ID (nullable)
- `OrganizationAccess` - One-to-one relationship with `TeamOrganizationAccess`
```

### Benefits

1. **Single Source of Truth**: Code lives in source files only
2. **No Sync Issues**: Documentation never goes out of date
3. **Easier Maintenance**: Update code once, docs stay accurate
4. **Better Navigation**: Readers can jump directly to implementation

### Checklist

When updating documentation after implementation:

- [ ] Remove code blocks
- [ ] Add file references with paths
- [ ] Reference functions and types by symbol name, not line number
- [ ] Update status indicators (✅ Complete, ⚠️ Partial, ❌ Not Started)
- [ ] Verify file paths are correct
- [ ] Link to relevant related files

---

**Note**: This standard applies to all architecture and design documents. Implementation details should live in code, not documentation.

