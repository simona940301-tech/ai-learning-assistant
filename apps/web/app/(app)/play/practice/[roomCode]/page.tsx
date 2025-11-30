import { InfinitePracticeRoom } from '@/components/play/InfinitePracticeRoom'

interface PageProps {
    params: {
        roomCode: string
    }
}

export default function PracticeRoomPage({ params }: PageProps) {
    return <InfinitePracticeRoom roomCode={params.roomCode} />
}
