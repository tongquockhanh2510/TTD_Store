# TTD Store — tra cứu kho ổ cứng eMMC / eMCP

Ứng dụng tra cứu mã ổ cứng cho tiệm sửa điện thoại **TTD Store** — ĐT **0981 729 579**.
Gõ vài ký tự đầu của mã là biết mã đó nằm ở bảng nào, nhóm nào, dung lượng bao nhiêu.

Tên tiệm và số điện thoại nằm gọn trong `src/config.ts`, sửa một chỗ là đổi khắp nơi.

- **384 mã** nhập từ hai bảng tra: eMMC (nhóm `EMMC 1`–`EMMC 6` theo dung lượng) và eMCP
  (nhóm chân `A1`–`A10`).
- Kho được **mã hoá bằng mật khẩu**, có hai vai trò: chủ tiệm sửa được, thợ chỉ tra cứu.
- Chạy được trên điện thoại, không cần mạng sau khi đã mở trang.

## Chạy trên máy

```bash
npm install
```

```bash
npm run dev
```

Mở địa chỉ mà lệnh in ra (thường là `http://localhost:5173`).

Các lệnh khác:

| Lệnh                | Việc                                        |
| ------------------- | ------------------------------------------- |
| `npm run build`     | Đóng gói ra thư mục `dist/` để đưa lên mạng |
| `npm run preview`   | Xem thử bản đã đóng gói                     |
| `npm run typecheck` | Kiểm tra lỗi kiểu dữ liệu, không đóng gói   |

## Đưa lên mạng

Cả hai nơi đều đã có sẵn file cấu hình, chỉ cần nối kho Git vào là xong.

### Vercel

1. Đẩy mã nguồn lên GitHub.
2. Vào Vercel, chọn **Add New → Project**, trỏ vào kho vừa đẩy.
3. Vercel đọc `vercel.json` và tự nhận ra đây là dự án Vite. Bấm **Deploy**.

### Render

1. Đẩy mã nguồn lên GitHub.
2. Vào Render, chọn **New → Static Site**, trỏ vào kho.
3. Render đọc `render.yaml`. Nếu phải điền tay: Build Command `npm ci && npm run build`,
   Publish Directory `dist`.

> Phải dùng **https**. Phần khoá mật khẩu chạy bằng Web Crypto, thứ này trình duyệt chỉ cho chạy
> trên https (và trên `localhost` lúc phát triển). Cả Vercel lẫn Render đều cấp https sẵn.

## Cách khoá kho hoạt động

Không so sánh mật khẩu kiểu `if (mậtKhẩu === "1234")` — cách đó ai xem mã nguồn cũng đọc được.
Ở đây dùng cách bọc khoá:

1. Sinh một khoá dữ liệu ngẫu nhiên, dùng nó mã hoá danh sách mã (AES-GCM 256 bit).
2. Bọc khoá đó **hai lần** — một lần bằng mật khẩu chủ, một lần bằng mật khẩu thợ
   (PBKDF2, 200.000 vòng, SHA-256).
3. Mở kho là thử tháo từng gói. Gói nào tháo được thì đó là vai trò của người vừa nhập.

Mật khẩu **không được lưu ở bất kỳ đâu**, kể cả dạng băm. Xem `src/lib/crypto.ts`.

### Ba giới hạn cần biết

- **Quên mật khẩu là mất kho.** Không có nút khôi phục, vì không có gì để đối chiếu.
- **Mỗi máy một kho riêng.** Kho nằm trong `localStorage` của từng trình duyệt, không tự đồng bộ.
  Muốn thợ có dữ liệu của tiệm thì chủ bấm **Xuất dữ liệu**, gửi file cho thợ **Nhập** vào.
- **Phân quyền chỉ chặt khi dùng chung một máy.** Trên máy riêng của mình, thợ tự đặt được mật khẩu
  chủ vì máy họ là kho trắng. Muốn phân quyền thật giữa nhiều máy thì phải có máy chủ và cơ sở dữ
  liệu — đó là một dự án khác.

## Sửa dữ liệu

Hai cách:

- **Trong ứng dụng** — bấm ✎ ở góc phải trên (cần mật khẩu chủ), rồi Thêm / Sửa / Xoá. Thay đổi
  lưu ngay vào máy, dùng **Xuất dữ liệu** để giữ một bản backup.
- **Sửa mã nguồn** — mở `src/data/emmc.ts` hoặc `src/data/emcp.ts`, thêm dòng vào mảng `codes` của
  đúng nhóm. Cách này đổi dữ liệu gốc, chỉ có tác dụng với kho tạo mới hoặc khi bấm *Khôi phục gốc*.

> Toàn bộ 384 mã được đọc bằng mắt từ ảnh chụp hai bảng tra, nên có thể sai ở những ký tự dễ nhầm
> (`0`/`O`, `1`/`I`, `8`/`B`). Nên đối chiếu lại những mã hay dùng nhất.

## Cấu trúc thư mục

```
src/
  config.ts   tên tiệm, số điện thoại
  data/       dữ liệu gốc hai bảng, tách riêng để dễ sửa
  lib/
    crypto.ts   mã hoá, bọc khoá, đổi mật khẩu
    search.ts   chuẩn hoá mã, xếp hạng kết quả, tô chỗ trùng khớp
    storage.ts  đọc ghi localStorage
  components/
    Logo.tsx    logo tiệm, vẽ bằng SVG
    Gate.tsx    màn đặt mật khẩu và màn đăng nhập
    ChipList.tsx thẻ mã, lưới nhóm
    Modals.tsx  các hộp thoại thêm/sửa, xuất, nhập, đổi mật khẩu
  App.tsx     ghép mọi thứ lại, giữ trạng thái
```

## Cách tìm kiếm hoạt động

Mã được chuẩn hoá bằng cách bỏ hết dấu cách, gạch nối, gạch chéo rồi viết hoa. Nhờ vậy gõ
`klmag4fe4b` hay `KLMAG-4FE4B` đều ra cùng một mã.

Kết quả xếp theo độ khớp: khớp từ đầu mã lên trước, rồi tới khớp từ đầu một đoạn, cuối cùng là
khớp ở giữa. Những ô gộp nhiều mã như `JZ006-JZ018-JZ050` được giữ nguyên như trong ảnh gốc,
nhưng gõ riêng `JZ018` vẫn tìm thấy.
