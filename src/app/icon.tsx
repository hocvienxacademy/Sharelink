import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(
    join(process.cwd(), "public", "images", "logoTVU.jpg"),
  );
  const logoDataUrl = `data:image/jpeg;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <img
          src={logoDataUrl}
          alt=""
          width={60}
          height={60}
          style={{
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      </div>
    ),
    size,
  );
}
