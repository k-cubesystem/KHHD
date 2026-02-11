// 도깨비 아바타 5종 - 귀여운 2D 스타일

export const DOKKAEBI_AVATARS = [
  {
    id: "dokkaebi-red",
    name: "홍색 도깨비",
    color: "#FF6B6B",
    svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* 얼굴 */}
        <circle cx="50" cy="50" r="35" fill="#FF6B6B" />

        {/* 뿔 */}
        <path d="M 35 25 Q 32 15 30 20 Q 28 25 32 28 Z" fill="#8B0000" />
        <path d="M 65 25 Q 68 15 70 20 Q 72 25 68 28 Z" fill="#8B0000" />

        {/* 눈 */}
        <ellipse cx="40" cy="45" rx="4" ry="6" fill="#2C3E50" />
        <ellipse cx="60" cy="45" rx="4" ry="6" fill="#2C3E50" />
        <circle cx="41" cy="43" r="1.5" fill="white" />
        <circle cx="61" cy="43" r="1.5" fill="white" />

        {/* 입 */}
        <path d="M 40 60 Q 50 65 60 60" stroke="#2C3E50" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* 볼 */}
        <circle cx="32" cy="52" r="5" fill="#FF4757" opacity="0.5" />
        <circle cx="68" cy="52" r="5" fill="#FF4757" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "dokkaebi-blue",
    name: "청색 도깨비",
    color: "#4ECDC4",
    svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* 얼굴 */}
        <circle cx="50" cy="50" r="35" fill="#4ECDC4" />

        {/* 뿔 */}
        <path d="M 35 25 Q 32 15 30 20 Q 28 25 32 28 Z" fill="#006D77" />
        <path d="M 65 25 Q 68 15 70 20 Q 72 25 68 28 Z" fill="#006D77" />

        {/* 눈 */}
        <ellipse cx="40" cy="45" rx="4" ry="6" fill="#2C3E50" />
        <ellipse cx="60" cy="45" rx="4" ry="6" fill="#2C3E50" />
        <circle cx="41" cy="43" r="1.5" fill="white" />
        <circle cx="61" cy="43" r="1.5" fill="white" />

        {/* 입 (장난스러운 미소) */}
        <path d="M 38 58 Q 50 63 62 58" stroke="#2C3E50" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* 볼 */}
        <circle cx="32" cy="52" r="5" fill="#1D7874" opacity="0.4" />
        <circle cx="68" cy="52" r="5" fill="#1D7874" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "dokkaebi-yellow",
    name: "황금 도깨비",
    color: "#F9CA24",
    svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* 얼굴 */}
        <circle cx="50" cy="50" r="35" fill="#F9CA24" />

        {/* 뿔 */}
        <path d="M 35 25 Q 32 15 30 20 Q 28 25 32 28 Z" fill="#E58E26" />
        <path d="M 65 25 Q 68 15 70 20 Q 72 25 68 28 Z" fill="#E58E26" />

        {/* 눈 (반짝이는) */}
        <ellipse cx="40" cy="45" rx="5" ry="7" fill="#2C3E50" />
        <ellipse cx="60" cy="45" rx="5" ry="7" fill="#2C3E50" />
        <circle cx="42" cy="43" r="2" fill="white" />
        <circle cx="62" cy="43" r="2" fill="white" />

        {/* 입 (환한 미소) */}
        <path d="M 38 60 Q 50 68 62 60" stroke="#2C3E50" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* 볼 */}
        <circle cx="32" cy="52" r="5" fill="#F39C12" opacity="0.5" />
        <circle cx="68" cy="52" r="5" fill="#F39C12" opacity="0.5" />

        {/* 별 장식 */}
        <path d="M 50 30 L 51 33 L 54 33 L 52 35 L 53 38 L 50 36 L 47 38 L 48 35 L 46 33 L 49 33 Z" fill="#FFF" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: "dokkaebi-green",
    name: "녹색 도깨비",
    color: "#6BCF7F",
    svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* 얼굴 */}
        <circle cx="50" cy="50" r="35" fill="#6BCF7F" />

        {/* 뿔 */}
        <path d="M 35 25 Q 32 15 30 20 Q 28 25 32 28 Z" fill="#2E7D32" />
        <path d="M 65 25 Q 68 15 70 20 Q 72 25 68 28 Z" fill="#2E7D32" />

        {/* 눈 (평화로운) */}
        <path d="M 36 45 Q 40 42 44 45" stroke="#2C3E50" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 56 45 Q 60 42 64 45" stroke="#2C3E50" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* 입 (만족스러운) */}
        <path d="M 42 60 Q 50 63 58 60" stroke="#2C3E50" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* 볼 */}
        <circle cx="32" cy="52" r="5" fill="#43A047" opacity="0.5" />
        <circle cx="68" cy="52" r="5" fill="#43A047" opacity="0.5" />

        {/* 나뭇잎 장식 */}
        <path d="M 48 28 Q 46 30 48 32 Q 50 30 48 28 Z" fill="#388E3C" />
      </svg>
    ),
  },
  {
    id: "dokkaebi-purple",
    name: "보라 도깨비",
    color: "#A29BFE",
    svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* 얼굴 */}
        <circle cx="50" cy="50" r="35" fill="#A29BFE" />

        {/* 뿔 */}
        <path d="M 35 25 Q 32 15 30 20 Q 28 25 32 28 Z" fill="#6C5CE7" />
        <path d="M 65 25 Q 68 15 70 20 Q 72 25 68 28 Z" fill="#6C5CE7" />

        {/* 눈 (신비로운) */}
        <ellipse cx="40" cy="45" rx="4" ry="6" fill="#2C3E50" />
        <ellipse cx="60" cy="45" rx="4" ry="6" fill="#2C3E50" />
        <circle cx="41" cy="44" r="1.5" fill="white" />
        <circle cx="61" cy="44" r="1.5" fill="white" />

        {/* 입 (미소) */}
        <path d="M 40 59 Q 50 64 60 59" stroke="#2C3E50" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* 볼 */}
        <circle cx="32" cy="52" r="5" fill="#7B68EE" opacity="0.4" />
        <circle cx="68" cy="52" r="5" fill="#7B68EE" opacity="0.4" />

        {/* 달 장식 */}
        <circle cx="72" cy="30" r="3" fill="#FFF" opacity="0.7" />
      </svg>
    ),
  },
] as const;

export type DokkaebiAvatarId = typeof DOKKAEBI_AVATARS[number]["id"];

// 아바타 URL 생성 헬퍼
export function getDokkaebiAvatarUrl(avatarId: DokkaebiAvatarId): string {
  return `/avatars/${avatarId}.svg`;
}

// 소셜 아바타인지 도깨비 아바타인지 확인
export function isDokkaebiAvatar(avatarUrl: string | null): boolean {
  if (!avatarUrl) return false;
  return avatarUrl.startsWith("/avatars/dokkaebi-");
}

// 아바타 ID 추출
export function getAvatarId(avatarUrl: string | null): DokkaebiAvatarId | null {
  if (!avatarUrl || !isDokkaebiAvatar(avatarUrl)) return null;
  const match = avatarUrl.match(/dokkaebi-(red|blue|yellow|green|purple)/);
  return match ? (`dokkaebi-${match[1]}` as DokkaebiAvatarId) : null;
}
