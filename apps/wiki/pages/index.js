import Head from 'next/head'
// import Image from 'next/image'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Lore Engine</title>
        <meta name="description" content="Lore engine" />
        {/* <link rel="icon" href="/favicon.ico" /> */}
      </Head>

      <main className={styles.main}>
        <img src="/assets/logo.svg" alt="Webaverse Wiki" />
      </main>
    </div>
  )
}
