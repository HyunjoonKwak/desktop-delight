# Desktop Organizer Pro

Windows와 macOS에서 사용 가능한 데스크톱 파일 정리 프로그램입니다.

## 주요 기능

- **바탕화면 정리**: 파일을 유형별로 자동 분류 (이미지, 문서, 비디오, 음악, 압축파일 등)
- **일괄 이름 변경**: 접두사/접미사, 일련번호, 날짜, 정규식 기반 파일명 변경
- **확장자 분류**: 확장자별 또는 카테고리별로 파일 정리
- **폴더 매니저**: 폴더 트리 시각화, 중복/빈폴더/대용량 파일 검색

## 기술 스택

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Tauri v2 (Rust)
- **Database**: SQLite

## 개발 환경 설정

### 사전 요구사항

- Node.js 18+
- Rust (https://rustup.rs)
- 플랫폼별 빌드 도구:
  - **Windows**: Microsoft C++ Build Tools
  - **macOS**: Xcode Command Line Tools

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

## 프로젝트 구조

```
├── src/                  # React 프론트엔드
│   ├── components/       # UI 컴포넌트
│   ├── hooks/            # 커스텀 훅
│   ├── lib/              # 유틸리티
│   └── stores/           # Zustand 상태 관리
├── src-tauri/            # Rust 백엔드
│   ├── src/
│   │   ├── commands/     # Tauri IPC 명령
│   │   ├── database/     # SQLite 작업
│   │   └── services/     # 비즈니스 로직
│   └── Cargo.toml
└── package.json
```

## 라이선스

MIT
