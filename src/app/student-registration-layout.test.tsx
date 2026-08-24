import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Children, isValidElement, type ReactNode } from "react";
import RegistrationLayout from "./dang-ky/[token]/layout";

function collectHrefs(node: ReactNode): readonly string[] {
  if (!isValidElement<{
    readonly children?: ReactNode;
    readonly href?: unknown;
    readonly render?: ReactNode;
  }>(node)) {
    return [];
  }

  const ownHref = typeof node.props.href === "string" ? [node.props.href] : [];
  return [
    ...ownHref,
    ...Children.toArray(node.props.children).flatMap(collectHrefs),
    ...Children.toArray(node.props.render).flatMap(collectHrefs),
  ];
}

describe("student registration layout", () => {
  it("does not provide navigation to the public home or staff login", () => {
    const hrefs = collectHrefs(
      RegistrationLayout({ children: <p>Nội dung hồ sơ</p> }),
    );

    assert.deepEqual(hrefs, []);
  });
});
