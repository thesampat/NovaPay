import http from 'k6/http'
import { check, sleep } from 'k6'


export const options = {
    // stages: [
    //     { duration: '10s', target: 10 },
    //     { duration: '30s', target: 10 },

    //     // Spike
    //     { duration: '5s', target: 500 },
    //     { duration: '30s', target: 500 },

    //     // Recovery back to baseline
    //     { duration: '20s', target: 10    },
    //     { duration: '30s', target: 10 },

    //     // Cooldown to 0
    //     { duration: '30s', target: 0 },
    // ],

    vus: 100, duration: '10s'
}


export default function () {
    const params = {
        headers: {
            'idempotency-key': '1212890'
        }
    }
    let res = http.get('http://localhost:3000/wallet/balance?userId=17', params)
    check(res, { 'success login': (r) => r.status === 200 })
    sleep(0.3)
}



