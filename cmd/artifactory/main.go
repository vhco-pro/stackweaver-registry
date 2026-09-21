// Command artifactory is the registry server.
//
// Nothing is implemented yet. The build order and the reasoning behind it are in
// docs/internal/plans/foundation/project-charter.md; the conformance harness is built before
// the first format handler, deliberately.
package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Fprintln(os.Stderr, "artifactory: not implemented yet - see docs/internal/plans/foundation/")
	os.Exit(1)
}
