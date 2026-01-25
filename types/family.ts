export interface FamilyMember {
    id: string;
    user_id?: string;
    name: string;
    relationship?: string;
    relation?: string;
    birth_date: string;
    birth_time?: string;
    calendar_type?: "solar" | "lunar";
    gender?: "male" | "female";
    home_address?: string;
    face_image_url?: string;
    hand_image_url?: string;
    created_at?: string;
}
