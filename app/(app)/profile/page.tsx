import { redirect } from 'next/navigation'

/**
 * Profile 頁面已合併到 /home
 * 此頁面僅作重定向用途
 */
export default function ProfilePage() {
  redirect('/home')
}
