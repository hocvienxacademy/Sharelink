import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Children, isValidElement, type ReactNode } from "react";
import HomePage from "./page";

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

describe("public home page", () => {
  it("does not advertise the staff login route", () => {
    const hrefs = collectHrefs(HomePage());

    assert.equal(hrefs.includes("/dang-nhap"), false);
  });
});
