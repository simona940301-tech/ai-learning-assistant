'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NamingFormProps {
    onSubmit: (chickName: string, userNickname: string) => void
}

const SUGGESTIONS = {
    chick: ['小黃', '皮皮', '嘰嘰', '豆豆', '球球', '毛毛'],
    user: ['主人', '夥伴', '朋友', '老師', '同學'],
}

export function NamingForm({ onSubmit }: NamingFormProps) {
    const [chickName, setChickName] = useState('')
    const [userNickname, setUserNickname] = useState('')
    const [errors, setErrors] = useState<{ chick?: string; user?: string }>({})

    const validateName = (name: string, type: 'chick' | 'user') => {
        if (!name || name.trim().length === 0) {
            return '請輸入名稱'
        }
        if (name.trim().length > 12) {
            return '名稱不能超過 12 個字元'
        }
        // Check for special characters (allow Chinese, English, numbers, spaces)
        if (!/^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/.test(name)) {
            return '名稱只能包含中文、英文、數字'
        }
        return null
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const chickError = validateName(chickName, 'chick')
        const userError = validateName(userNickname, 'user')

        if (chickError || userError) {
            setErrors({
                chick: chickError || undefined,
                user: userError || undefined,
            })
            return
        }

        onSubmit(chickName.trim(), userNickname.trim())
    }

    const handleChickNameChange = (value: string) => {
        setChickName(value)
        if (errors.chick) {
            setErrors({ ...errors, chick: undefined })
        }
    }

    const handleUserNicknameChange = (value: string) => {
        setUserNickname(value)
        if (errors.user) {
            setErrors({ ...errors, user: undefined })
        }
    }

    const isValid = chickName.trim().length > 0 && userNickname.trim().length > 0

    return (
        <div className="w-full max-w-md mx-auto px-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h2 className="text-2xl font-bold text-[#1C1917] mb-2">
                    讓我們互相認識
                </h2>
                <p className="text-sm text-[#57534E]">
                    取個好名字，開啟你們的冒險旅程
                </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Chick Name */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-2"
                >
                    <Label htmlFor="chick-name" className="text-sm font-medium text-[#1C1917]">
                        我該怎麼稱呼你的夥伴？
                    </Label>
                    <Input
                        id="chick-name"
                        type="text"
                        placeholder="例如：小黃、皮皮"
                        value={chickName}
                        onChange={(e) => handleChickNameChange(e.target.value)}
                        maxLength={12}
                        className={`h-12 text-base ${errors.chick ? 'border-red-500 focus:border-red-500' : ''
                            }`}
                        autoFocus
                    />
                    {errors.chick && (
                        <p className="text-xs text-red-500">{errors.chick}</p>
                    )}
                    {!errors.chick && chickName.length === 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs text-[#A8A29E]">建議：</span>
                            {SUGGESTIONS.chick.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => handleChickNameChange(suggestion)}
                                    className="text-xs px-2 py-1 rounded-full bg-[#FFFBF0] border border-[#E0D0B8] text-[#57534E] hover:bg-[#FFF8E1] transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* User Nickname */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                >
                    <Label htmlFor="user-nickname" className="text-sm font-medium text-[#1C1917]">
                        你希望夥伴怎麼稱呼你？
                    </Label>
                    <Input
                        id="user-nickname"
                        type="text"
                        placeholder="例如：主人、朋友"
                        value={userNickname}
                        onChange={(e) => handleUserNicknameChange(e.target.value)}
                        maxLength={12}
                        className={`h-12 text-base ${errors.user ? 'border-red-500 focus:border-red-500' : ''
                            }`}
                    />
                    {errors.user && (
                        <p className="text-xs text-red-500">{errors.user}</p>
                    )}
                    {!errors.user && userNickname.length === 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs text-[#A8A29E]">建議：</span>
                            {SUGGESTIONS.user.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => handleUserNicknameChange(suggestion)}
                                    className="text-xs px-2 py-1 rounded-full bg-[#FFFBF0] border border-[#E0D0B8] text-[#57534E] hover:bg-[#FFF8E1] transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Submit Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Button
                        type="submit"
                        disabled={!isValid}
                        className="w-full h-12 text-base font-bold bg-[#FFB01A] hover:bg-[#E69500] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        確認名稱
                    </Button>
                </motion.div>
            </form>

            {/* Character count */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 text-center text-xs text-[#A8A29E]"
            >
                名稱長度：1-12 個字元
            </motion.div>
        </div>
    )
}
