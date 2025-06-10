import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

const PersonDataPage = () => {
    const [profile, setProfile] = useState(null);
    const email = localStorage.getItem("userEmail");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get("http://localhost:5713/api/profile", {
                    params: { email },
                });
                if (res.data.success) {
                    setProfile(res.data.data);
                }
            } catch (err) {
                console.error("取得個人資料失敗：", err);
            }
        };

        if (email) fetchProfile();
    }, [email]);

    if (!email) {
        return <div>請先登入以查看個人資料。</div>;
    }

    return (
        <div>

            <div className="main-content">
                <h2>個人資料</h2>
                {profile ? (
                    <ul>
                        <li>顧客姓名：{profile.顧客姓名}</li>
                        <li>電話：{profile.電話}</li>
                        <li>電子信箱：{profile.電子信箱}</li>
                        <li>喜好風格：{profile.喜好風格}</li>
                        <li>生日：{profile.生日}</li>
                        <li>建檔時間：{profile.建檔時間}</li>
                    </ul>
                ) : (
                    <p>載入中...</p>
                )}
            </div>

        </div>
    );
};

export default PersonDataPage;