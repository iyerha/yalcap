package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface GroupMemberRepository extends CrudRepository<GroupMemberEntity, UUID> {
    List<GroupMemberEntity> findByGroupId(UUID groupId);
    List<GroupMemberEntity> findByUserId(UUID userId);
    List<GroupMemberEntity> findByUserKey(String userKey);
}
