import { BackpackLogicTester } from '@/components/debug/BackpackLogicTester'

export default function BackpackTestPage() {
    return (
        <div className="h-[100dvh] w-full overflow-y-auto bg-gray-50 py-12">
            <BackpackLogicTester />
        </div>
    )
}
