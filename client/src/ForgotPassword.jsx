import React, { useState } from 'react'
import axios from 'axios'

export default function ForgotPassword() {
  const [step, setStep] = useState(1) // 1: email, 2: otp, 3: success
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function requestOtp(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await axios.post('/request-otp', { email })
      if (response.data?.devMode) {
        setSuccess('OTP generated! Check the server console/terminal for the OTP code.')
      } else {
        setSuccess('OTP sent to your email')
      }
      setStep(2)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(e) {
    e.preventDefault()
    setError(null)
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await axios.post('/reset-password', { email, otp, newPassword })
      setSuccess('Password reset successful! You can now login.')
      setStep(3)
      setTimeout(() => {
        window.location.hash = ''
      }, 2000)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, marginTop: 16 }}>
      <h2 style={{ marginBottom: 16 }}>Reset Password</h2>
      
      {step === 1 && (
        <form onSubmit={requestOtp}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email</label>
            <input 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              type="email" 
              placeholder="Enter your email"
              required 
              style={{ width: '100%', padding: 8 }} 
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <a href="#" style={{ marginLeft: 12 }}>Back to sign in</a>
          </div>
          {error && <div role="alert" style={{ marginTop: 10, color: 'crimson' }}>{error}</div>}
          {success && <div style={{ marginTop: 10, color: 'green' }}>{success}</div>}
        </form>
      )}

      {step === 2 && (
        <form onSubmit={resetPassword}>
          <div style={{ marginBottom: 12, padding: 12, backgroundColor: '#fff4e6', border: '1px solid #fbbf24', borderRadius: 4 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#92400e', fontWeight: 500 }}>📋 Check the server terminal/console for your OTP</p>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#92400e' }}>Email: {email}</p>
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Enter OTP</label>
            <input 
              value={otp} 
              onChange={e => setOtp(e.target.value)} 
              type="text" 
              placeholder="6-digit OTP"
              maxLength="6"
              required 
              style={{ width: '100%', padding: 8, fontSize: 18, letterSpacing: 3 }} 
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>New Password</label>
            <input 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              type="password" 
              placeholder="Enter new password"
              required 
              style={{ width: '100%', padding: 8 }} 
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Confirm Password</label>
            <input 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              type="password" 
              placeholder="Confirm new password"
              required 
              style={{ width: '100%', padding: 8 }} 
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(1)} 
              style={{ marginLeft: 12, padding: '8px 12px', background: '#e5e7eb', color: '#374151' }}
            >
              Back
            </button>
          </div>
          {error && <div role="alert" style={{ marginTop: 10, color: 'crimson' }}>{error}</div>}
        </form>
      )}

      {step === 3 && (
        <div style={{ padding: 16, backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4 }}>
          <h3 style={{ color: '#15803d', marginTop: 0 }}>✓ Success!</h3>
          <p style={{ color: '#15803d' }}>Your password has been reset successfully.</p>
          <p style={{ color: '#15803d' }}>Redirecting to login...</p>
        </div>
      )}
    </div>
  )
}
